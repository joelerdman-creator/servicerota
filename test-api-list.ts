
const API_KEY = "AIzaSyBxgs79GoS7H9i2nPTh-4LnocGk4aviC54";

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  console.log(`Listing models...`);
  try {
      const response = await fetch(url);

      if (response.ok) {
          const data = await response.json();
          console.log("Available Models:");
          data.models.forEach((m: any) => console.log(`- ${m.name} (${m.supportedGenerationMethods})`));
      } else {
          console.log(`FAILED ListModels: ${response.status}`);
          const text = await response.text();
          console.log(text);
      }
  } catch (e) {
      console.error(`ERROR:`, e);
  }
}

listModels();
