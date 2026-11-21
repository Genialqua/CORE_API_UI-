# CORE API UI

An Angular-based web application providing an interface for interacting with the CORE API platform and exploring open-access research data.

## Project Repository

**GitHub Repository:**  
[https://github.com/Genialqua/CORE_API_UI-](https://github.com/Genialqua/CORE_API_UI-)

**Application Source:**  
[core_api_ui-](https://github.com/Genialqua/CORE_API_UI-/tree/main/core_api_ui-)

## Getting Started

Follow the instructions below to clone the repository, install dependencies, configure the Angular environment and run the application locally.

### 1. Prerequisites

Ensure the following tools are installed:

- Node.js 22
- NVM (Node Version Manager)
- npm
- Git

### 2. Clone the Repository

Clone the project:

```bash
git clone https://github.com/Genialqua/CORE_API_UI-.git
```

Navigate into the repository:

```bash
cd CORE_API_UI-
```

Navigate into the Angular application directory:

```bash
cd core_api_ui-
```

### 3. Configure Node.js

This project requires Node.js 22.

Switch to the required version using NVM:

```bash
nvm use 22
```

If Node.js 22 is not installed, install it first:

```bash
nvm install 22
nvm use 22
```

Verify the installed versions:

```bash
node -v
npm -v
```

### 4. Install Dependencies

Install the project dependencies:

```bash
npm install
```

### 5. Configure Angular Environment Variables

The application uses Angular environment configuration to manage application settings and CORE API connection details.

Locate the environment configuration file:

```text
src/environments/environment.ts
```

Configure the CORE API settings:

```typescript
export const environment = {
  production: false,

  coreApi: {
    baseUrl: 'https://api.core.ac.uk/v3',
    apiKey: 'YOUR_CORE_API_KEY',
  },
};
```

Replace `YOUR_CORE_API_KEY` with your valid CORE API key.

The application configuration imports these values from the Angular environment file, allowing the API settings to be managed separately from the API service implementation.

**Security Notice:**

Angular environment files are bundled into the client-side application during compilation. Consequently, API keys configured in these files are accessible to users inspecting the browser application.

- Do not commit real API credentials to the public repository.
- Do not treat Angular environment variables as secure storage for API keys.
- For production deployments, use a secure backend to store the CORE API key and proxy API requests.

### 6. Start the Development Server

There are two ways to start the Angular development server.

**Option A: Using globally installed Angular CLI**

If Angular CLI is installed globally, run:

```bash
ng serve
```

**Option B: Using npx (recommended)**

If Angular CLI is not installed globally, run:

```bash
npx ng serve
```

Once the development server starts successfully, open your browser:

[http://localhost:4200/](http://localhost:4200/)

The application automatically reloads whenever changes are made to the source files.

---

## Development Commands

### Generate Components

Use Angular CLI to generate new components:

```bash
ng generate component component-name
```

View available Angular CLI commands:

```bash
ng generate --help
```

### Build the Application

To build the application:

```bash
ng build
```

The compiled application files will be generated in the `dist/` directory.

Angular optimizes the production build for performance and deployment.

### Run Unit Tests

This project uses Jasmine as its testing framework and Karma as its test runner.

Execute the unit tests:

```bash
ng test
```

To execute tests once without starting watch mode:

```bash
ng test --watch=false
```

### Run End-to-End Tests

To execute end-to-end tests:

```bash
ng e2e
```

**Note:** An end-to-end testing framework must be configured separately, as Angular CLI does not provide one by default.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| Angular 22 | Frontend application framework |
| TypeScript | Application development language |
| Node.js 22 | JavaScript runtime |
| npm | Package management |
| CORE API v3 | Research data and API integration |
| Jasmine | Unit testing framework |
| Karma | Unit test execution environment |

---

## Additional Resources

- [Angular Documentation](https://angular.dev/)
- [Angular CLI Documentation](https://angular.dev/tools/cli)
- [Node.js Documentation](https://nodejs.org/docs/)
- [NVM Documentation](https://github.com/nvm-sh/nvm)
- [Jasmine Documentation](https://jasmine.github.io/)
- [Karma Documentation](https://karma-runner.github.io/)

## Contribution Guidelines

Contributions and improvements are welcome.

When contributing:

1. Create a dedicated branch for your changes.
2. Follow the existing project structure and coding conventions.
3. Ensure your changes do not introduce regressions.
4. Run the relevant tests before submitting.
5. Use clear and descriptive commit messages.
6. Submit changes through a pull request.

---

**CORE API UI**  
*An interface for accessing and exploring open-access research data.*
