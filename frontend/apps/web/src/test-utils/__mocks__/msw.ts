// Mock MSW for tests
export const setupServer = jest.fn(() => ({
  listen: jest.fn(),
  resetHandlers: jest.fn(),
  close: jest.fn(),
}));

export const http = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
};

export const HttpResponse = {
  json: jest.fn((data) => ({ data })),
  text: jest.fn((text) => ({ text })),
};