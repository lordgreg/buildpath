/** When each labyrinth unlocks. Shared by the ascendancy graph and guide text. */
export const LAB_MILESTONES = [
  { lab: 1, name: 'Normal lab', level: 33, where: 'after Act 3' },
  { lab: 2, name: 'Cruel lab', level: 55, where: 'after Act 7' },
  { lab: 3, name: 'Merciless lab', level: 68, where: 'after Act 10' },
  { lab: 4, name: 'Eternal lab', level: 75, where: 'in maps' },
] as const;

export function labFor(lab: number) {
  return LAB_MILESTONES.find((milestone) => milestone.lab === lab);
}
