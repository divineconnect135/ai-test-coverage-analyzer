export type ProjectPreview = {
  id: string
  name: string
  description: string
  requirementCount: number
  testCaseCount: number
}

export const mockProjects: ProjectPreview[] = [
  {
    id: 'sample-auth',
    name: 'Authentication System',
    description: 'Registration, login and password reset testing.',
    requirementCount: 3,
    testCaseCount: 4,
  },
  {
    id: 'sample-cart',
    name: 'Shopping Cart',
    description: 'Cart operations and quantity validation.',
    requirementCount: 4,
    testCaseCount: 6,
  },
]
