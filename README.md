# GlobeLingo

A full-stack language translation tool built for the HorizonTechX internship.

## Project structure

- `frontend/` — Create React App interface
- `backend/` — Express API foundation

## Run locally

In separate terminals:

```bash
cd frontend
npm start
```

```bash
cd backend
npm start
```

The frontend runs on `http://localhost:3000`; the backend health endpoint is `http://localhost:5000/api/health`.

## Configure Azure Translator

1. Create an Azure AI Translator resource and copy its key, region, and endpoint from the Azure portal.
2. In `backend`, copy `.env.example` to `.env`.
3. Set `AZURE_TRANSLATOR_KEY`, `AZURE_TRANSLATOR_REGION` (optional for a global single-service resource), and `AZURE_TRANSLATOR_ENDPOINT` in that local file.

The React app uses its development proxy for `/api` requests, so credentials never leave the backend. Without a configured `.env`, the API returns a safe configuration error instead of a fabricated translation.

## Current capabilities

- Searchable source and target language pickers, including automatic source detection
- Azure Translator-backed `POST /api/translate`
- Copy feedback, browser text-to-speech, RTL text support, Ctrl + Enter, and a 5,000 character limit

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
