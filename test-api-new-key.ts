
const API_KEY = "AIzaSyBxgs79GoS7H9i2nPTh-4LnocGk4aviC54";

async function test() {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    console.log(`Testing ${model}...`);
    try {
        const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello, list 3 fruits." }] }]
        })
        });

        if (response.ok) {
            console.log(`SUCCESS with ${model}`);
            const data = await response.json();
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(`FAILED ${model}: ${response.status}`);
            const text = await response.text();
            console.log(text);
        }
    } catch (e) {
        console.error(`ERROR ${model}:`, e);
    }
}

test();
