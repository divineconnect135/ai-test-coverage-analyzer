export type MockRequirement = {
  id: string
  title: string
  description: string
}

export type MockTestCase = {
  id: string
  title: string
  status: 'DRAFT' | 'READY' | 'COMPLETED'
  requirementIds: string[]
}

export type MockProjectDetail = {
  requirements: MockRequirement[]
  testCases: MockTestCase[]
}

export const mockProjectDetails: Record<string, MockProjectDetail> = {
  'sample-auth': {
    requirements: [
      {
        id: 'AUTH-001',
        title: 'User Registration',
        description: 'Users can register using an email address and password.',
      },
      {
        id: 'AUTH-002',
        title: 'User Login',
        description: 'Users can log in using valid credentials.',
      },
      {
        id: 'AUTH-003',
        title: 'Password Reset',
        description: 'Users can request a password reset.',
      },
    ],
    testCases: [
      {
        id: 'TC-001',
        title: 'Register with valid details',
        status: 'READY',
        requirementIds: ['AUTH-001'],
      },
      {
        id: 'TC-002',
        title: 'Login with correct credentials',
        status: 'COMPLETED',
        requirementIds: ['AUTH-002'],
      },
      {
        id: 'TC-003',
        title: 'Login with an incorrect password',
        status: 'DRAFT',
        requirementIds: ['AUTH-002'],
      },
      {
        id: 'TC-004',
        title: 'Request password reset with a valid email',
        status: 'READY',
        requirementIds: ['AUTH-003'],
      },
    ],
  },
  'sample-cart': {
    requirements: [
      {
        id: 'CART-001',
        title: 'Add Products',
        description: 'Users can add available products to their cart.',
      },
      {
        id: 'CART-002',
        title: 'Remove Products',
        description: 'Users can remove products from their cart.',
      },
      {
        id: 'CART-003',
        title: 'Update Quantity',
        description: 'Users can change product quantities.',
      },
      {
        id: 'CART-004',
        title: 'Cart Total',
        description: 'The cart displays the total price of its items.',
      },
    ],
    testCases: [
      {
        id: 'TC-101',
        title: 'Add one product',
        status: 'READY',
        requirementIds: ['CART-001'],
      },
      {
        id: 'TC-102',
        title: 'Add multiple products',
        status: 'READY',
        requirementIds: ['CART-001'],
      },
      {
        id: 'TC-103',
        title: 'Remove an existing product',
        status: 'DRAFT',
        requirementIds: ['CART-002'],
      },
      {
        id: 'TC-104',
        title: 'Increase product quantity',
        status: 'COMPLETED',
        requirementIds: ['CART-003'],
      },
      {
        id: 'TC-105',
        title: 'Decrease product quantity',
        status: 'READY',
        requirementIds: ['CART-003'],
      },
      {
        id: 'TC-106',
        title: 'Calculate total for multiple products',
        status: 'DRAFT',
        requirementIds: ['CART-004'],
      },
    ],
  },
}
