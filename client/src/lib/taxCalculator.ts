import type { Item, Person, PersonBreakdown } from '../types'

export function calculatePersonBreakdown(
  person: Person,
  items: Item[],
  tipPercentage: number
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

  const foodTax = foodSubtotal * 0.07
  const alcoholTax = alcoholSubtotal * 0.10

  const mySubtotal = foodSubtotal + alcoholSubtotal
  const grandSubtotal = items.reduce((sum, i) => sum + i.totalPrice, 0)
  const totalTip = grandSubtotal * (tipPercentage / 100)
  const tipShare = grandSubtotal > 0 ? (mySubtotal / grandSubtotal) * totalTip : 0

  return {
    personId: person.id,
    foodSubtotal,
    alcoholSubtotal,
    foodTax,
    alcoholTax,
    tipShare,
    total: foodSubtotal + alcoholSubtotal + foodTax + alcoholTax + tipShare,
  }
}

export function calculateAllBreakdowns(
  people: Person[],
  items: Item[],
  tipPercentage: number
): PersonBreakdown[] {
  return people.map(p => calculatePersonBreakdown(p, items, tipPercentage))
}

export function validateBillTotal(
  breakdowns: PersonBreakdown[],
  items: Item[],
  tipPercentage: number
): boolean {
  const grandSubtotal = items.reduce((sum, i) => sum + i.totalPrice, 0)
  const totalTip = grandSubtotal * (tipPercentage / 100)
  const totalFoodTax = items
    .filter(i => !i.isAlcohol)
    .reduce((sum, i) => sum + i.totalPrice * 0.07, 0)
  const totalAlcoholTax = items
    .filter(i => i.isAlcohol)
    .reduce((sum, i) => sum + i.totalPrice * 0.10, 0)
  const expectedTotal = grandSubtotal + totalFoodTax + totalAlcoholTax + totalTip

  const actualTotal = breakdowns.reduce((sum, b) => sum + b.total, 0)
  return Math.abs(expectedTotal - actualTotal) <= 0.01
}
