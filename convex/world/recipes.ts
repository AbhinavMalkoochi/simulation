export interface Recipe {
  name: string;
  inputs: Array<{ type: string; quantity: number }>;
  output: { type: string; quantity: number };
  skillRequired: string;
  minSkillLevel: number;
}

export const RECIPES: Recipe[] = [
  {
    name: "wooden_plank",
    inputs: [{ type: "wood", quantity: 3 }],
    output: { type: "wooden_plank", quantity: 2 },
    skillRequired: "crafting",
    minSkillLevel: 0,
  },
  {
    name: "stone_tools",
    inputs: [{ type: "stone", quantity: 2 }, { type: "wood", quantity: 1 }],
    output: { type: "stone_tools", quantity: 1 },
    skillRequired: "crafting",
    minSkillLevel: 1,
  },
  {
    name: "meal",
    inputs: [{ type: "food", quantity: 2 }],
    output: { type: "meal", quantity: 1 },
    skillRequired: "gathering",
    minSkillLevel: 0,
  },
  {
    name: "medicine",
    inputs: [{ type: "herbs", quantity: 3 }],
    output: { type: "medicine", quantity: 1 },
    skillRequired: "gathering",
    minSkillLevel: 2,
  },
  {
    name: "metal_tools",
    inputs: [{ type: "metal", quantity: 2 }, { type: "wood", quantity: 1 }],
    output: { type: "metal_tools", quantity: 1 },
    skillRequired: "crafting",
    minSkillLevel: 2,
  },
  {
    name: "rope",
    inputs: [{ type: "herbs", quantity: 2 }, { type: "wood", quantity: 1 }],
    output: { type: "rope", quantity: 1 },
    skillRequired: "crafting",
    minSkillLevel: 1,
  },
];

export interface BuildingCost {
  type: string;
  resources: Array<{ type: string; quantity: number }>;
  skillRequired: string;
  minSkillLevel: number;
}

export const BUILDING_COSTS: Record<string, BuildingCost> = {
  shelter: {
    type: "shelter",
    resources: [{ type: "wood", quantity: 5 }, { type: "stone", quantity: 3 }],
    skillRequired: "building",
    minSkillLevel: 1,
  },
  workshop: {
    type: "workshop",
    resources: [{ type: "wood", quantity: 8 }, { type: "stone", quantity: 5 }, { type: "metal", quantity: 2 }],
    skillRequired: "building",
    minSkillLevel: 3,
  },
  market: {
    type: "market",
    resources: [{ type: "wood", quantity: 10 }, { type: "stone", quantity: 8 }],
    skillRequired: "building",
    minSkillLevel: 2,
  },
  farm: {
    type: "farm",
    resources: [{ type: "wood", quantity: 4 }, { type: "stone", quantity: 2 }],
    skillRequired: "building",
    minSkillLevel: 1,
  },
  storehouse: {
    type: "storehouse",
    resources: [{ type: "wood", quantity: 6 }, { type: "stone", quantity: 4 }],
    skillRequired: "building",
    minSkillLevel: 2,
  },
  meetingHall: {
    type: "meetingHall",
    resources: [{ type: "wood", quantity: 12 }, { type: "stone", quantity: 10 }, { type: "metal", quantity: 3 }],
    skillRequired: "building",
    minSkillLevel: 3,
  },
};

export function findRecipe(name: string): Recipe | undefined {
  return RECIPES.find((r) => r.name === name);
}
