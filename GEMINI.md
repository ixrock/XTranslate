# Gemini Code Assistant Context

This document provides context for the Gemini code assistant to understand the XTranslate project.

## Project Overview

XTranslate is a Chrome browser extension that provides in-place translation of web pages. It allows users to translate single words, selected text, or entire pages. The extension supports multiple translation providers, including Google, Bing, OpenAI, Grok, DeepSeek and Gemini.

The project is built using TypeScript, React, and MobX. It uses Webpack for bundling and Sass for styling. The architecture is based on a service worker that acts as a central hub for communication between the content scripts and the extension's UI.

## File Structure

- **`src/background`**: This directory contains the service worker and its related modules. The service worker is responsible for handling background tasks such as managing storage, handling API requests, and orchestrating communication between different parts of the extension.
- **`src/user-script`**: This directory contains the content script that is injected into web pages. The content script is responsible for interacting with the DOM, detecting text selections, and displaying the translation UI.
- **`src/components`**: This directory contains the React components that are used to build the extension's UI. This includes the main application component, as well as various reusable components such as buttons, dialogs, and menus.
- **`src/providers`**: This directory contains the translation providers that are used by the extension. Each provider is implemented as a separate module that conforms to a common interface defined in `src/providers/translator.ts`. The `Translator` class provides a base implementation for all providers, including common functionality for handling API requests, managing API keys, and providing text-to-speech.
- **`src/pdf-viewer`**: This directory contains the code for the PDF viewer, which allows users to translate text in PDF files.
- **`src/utils`**: This directory contains various utility functions that are used throughout the project. The utility functions are well-tested with unit tests written using Jest.
- **`webpack.config.ts`**: The webpack configuration file, which defines the build process for the extension.
- **`manifest.json`**: The extension's manifest file, which defines the extension's properties and permissions.

## Building and Running

The following npm scripts are available for building, running, and testing the project:

*   `npm run dev`: Runs the project in development/watch mode.
*   `npm run build`: Compiles and packs the extension into the `/dist` directory.
*   `npm run test`: Runs the unit tests.
*   `npm run clean`: Removes the `/dist` directory.

### To build the project:

```bash
npm install
npm run build
```

### To run the project in development mode:

```bash
npm install
npm run dev
```

## Development Conventions

*   The project uses TypeScript for static typing.
*   React is used for building the user interface.
*   MobX is used for state management.
*   Sass is used for styling, with CSS modules for component-level styles.
*   The code is formatted using Prettier (inferred from the presence of `.prettierrc`).
*   Unit tests are written using Jest and can be found in files with the `.test.ts` extension. The tests use mocking to isolate components and ensure that they are tested in a predictable environment.
*   The project follows a modular architecture, with clear separation between the background service worker, content scripts, and the UI components.