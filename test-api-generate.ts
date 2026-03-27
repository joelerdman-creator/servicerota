
const API_KEY = "AIzaSyBxgs79GoS7H9i2nPTh-4LnocGk4aviC54";

async function testGeneration() {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  
  console.log(`--- Testing Content Generation with ${model} ---`);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello, what is your name?" }] }]
      })
    });

    if (response.ok) {
      console.log(`SUCCESS with ${model}`);
      const data = await response.json();
      console.log("Response:", JSON.stringify(data, null, 2));
    } else {
      console.log(`FAILED ${model}: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log("Error Body:", errorText);
    }
  } catch (e) {
    console.error(`FATAL ERROR testing ${model}:`, e);
  }
}

testGeneration();
