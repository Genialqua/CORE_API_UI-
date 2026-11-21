# CORE API UI

An Angular-based web application providing an interface for interacting with the CORE API platform.

## Project Repository

**GitHub:** [https://github.com/Genialqua/CORE_API_UI-](https://github.com/Genialqua/CORE_API_UI-)

**Application Source:** [core_api_ui-](https://github.com/Genialqua/CORE_API_UI-/tree/main/core_api_ui-)

## Getting Started

Follow the instructions below to clone the repository, install dependencies, configure your API credentials and run the application locally.

### 1. Prerequisites

Ensure the following tools are installed:

- Node.js 22
- NVM (Node Version Manager)
- npm
- Git

### 2. Clone the Repository

Clone the project:

```
git clone https://github.com/Genialqua/CORE_API_UI-.git
```

Navigate into the repository:

```
cd CORE_API_UI-
```

Navigate into the Angular application directory:

```
cd core_api_ui-
```

### 3. Configure Node.js

This project requires Node.js 22.

Switch to the required version using NVM:

```
nvm use 22
```

If Node.js 22 is not installed, install it first:

```
nvm install 22
nvm use 22
```

Verify your installed versions:

```
node -v
npm -v
```

### 4. Install Dependencies

Install the project dependencies:

```
npm install
```

### 5. Configure CORE API Keys

Before starting the application, configure your CORE API credentials.

Open the following configuration file:

```
src/app/research/api/research-api.config.ts
```

Enter the required CORE API keys in their respective configuration fields.

**Security Notice:** Do not commit confidential API credentials, private keys or secrets to the repository. Use environment-based configuration and a secure backend for sensitive credentials where supported by the API architecture.

### 6. Start the Development Server

There are two ways to start the Angular development server.

**Option A: Using globally installed Angular CLI**

If Angular CLI is already installed globally, run:

```
ng serve
```

**Option B: Using npx (recommended)**

If Angular CLI is not installed globally, run:

```
npx ng serve
```

Once the development server starts successfully, open your browser:

[http://localhost:4200/](http://localhost:4200/)

The application automatically reloads whenever changes are made to the source files.

---

## Development Commands

### Generate Components

Use Angular CLI to generate new components:

```
ng generate component component-name
```

View available Angular CLI commands:

```
ng generate --help
```

### Build the Application

To build the application:

```
ng build
```

The compiled application files will be generated in the `dist/` directory.

Angular optimizes the production build for performance and deployment.

### Run Unit Tests

This project uses Vitest as its unit testing framework.

Execute the unit tests using:

```
ng test
```

### Run End-to-End Tests

To execute end-to-end tests:

```
ng e2e
```

Note: An end-to-end testing framework must be configured separately, as Angular CLI does not provide one by default.

---

## Technology Stack

| Technology | Purpose                           |
| ---------- | --------------------------------- |
| Angular 22 | Frontend application framework    |
| Node.js 22 | JavaScript runtime                |
| npm        | Package management                |
| CORE API   | Research data and API integration |
| Vitest     | Unit testing                      |

## Additional Resources

- [Angular Documentation](https://angular.dev/)
- [Angular CLI Documentation](https://angular.dev/tools/cli)
- [Node.js Documentation](https://nodejs.org/docs/)
- [NVM Documentation](https://github.com/nvm-sh/nvm)
- [Vitest Documentation](https://vitest.dev/)

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

**CORE API UI**\
*An interface for accessing and exploring CORE API research data.*

