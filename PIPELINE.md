# Content Repurposing Engine Pipeline

## AI Processing Metadata Notes

> **A quick technical note on the AI Metadata:** Currently, your database schema stores the selected AI models as **Global Settings**, rather than tying them directly to individual projects. If you want the data table to accurately show historical model usage (e.g., knowing that a project from last month used Ollama instead of Gemini), we will eventually need to add those columns to the `jobs` or `projects` table to take a "snapshot" of the settings at the time of upload.
