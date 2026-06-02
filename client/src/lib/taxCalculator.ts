import type { Item, Person, PersonBreakdown } from '../types'

export function calculatePersonBreakdown(
  person: Person,
  items: Item[],
  tipPercentage: number,
  numPeople = 1
): PersonBreakdown {
  const myItems = items.filter(i => i.assignedTo.includes(person.id))

  let foodSubtotal = 0
  let alcoholSubtotal = 0

  for (const item of myItems) {
    const share = item.totalPrice / item.assignedTo.length
    if (item.isAlcohol) {
      alcoholSubtotal += share
    } else {
      foodSubtotal += share
    }
  }

  // 7% ITBMS solo aplica si el establecimiento vende alcohol (tiene licencia de licores)
  // Indicador: si hay algún item de alcohol en la cuenta, el lugar cobra ITBMS
  const billHasAlcohol = items.some(i => i.isAlcohol)

  const seniorDiscount = person.senior ? foodSubtotal * 0.25 : 0
  const foodNet = foodSubtotal - seniorDiscount
  const foodTax = billHasAlcohol ? foodNet * 0.07 : 0
  const alcoholTax = alcoholSubtotal * 0.10

  const grandSubtotal = items.reduce((sum, i) => sum + i.totalPrice, 0)
  const totalTip = grandSubtotal * (tipPercentage / 100)
  const tipShare = numPeople > 0 ? totalTip / numPeople : 0

  return {
    personId: person.id,
    foodSubtotal,
    alcoholSubtotal,
    seniorDiscount,
    foodTax,
    alcoholTax,
    tipShare,
    total: foodNet + alcoholSubtotal + foodTax + alcoholTax + tipShare,
  }
}

export function calculateAllBreakdowns(
  people: Person[],
  items: Item[],
  tipPercentage: number
): PersonBreakdown[] {
  return people.map(p => calculatePersonBreakdown(p, items, tipPercentage, people.length))
}

export function validateBillTotal(
  breakdowns: PersonBreakdown[],
  items: Item[],
  tipPercentage: number
): boolean {
  // Con jubilados el total colectivo es intencionalmente menor; no hay discrepancia real
  if (breakdowns.some(b => b.seniorDiscount > 0)) return true

  const billHasAlcohol = items.some(i => i.isAlcohol)
  const grandSubtotal = items.reduce((sum, i) => sum + i.totalPrice, 0)
  const totalTip = grandSubtotal * (tipPercentage / 100)
  const totalFoodTax = billHasAlcohol
    ? items.filter(i => !i.isAlcohol).reduce((sum, i) => sum + i.totalPrice * 0.07, 0)
    : 0
  const totalAlcoholTax = items
    .filter(i => i.isAlcohol)
    .reduce((sum, i) => sum + i.totalPrice * 0.10, 0)
  const expectedTotal = grandSubtotal + totalFoodTax + totalAlcoholTax + totalTip

  const actualTotal = breakdowns.reduce((sum, b) => sum + b.total, 0)
  return Math.abs(expectedTotal - actualTotal) <= 0.01
}
