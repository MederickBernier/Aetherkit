export async function pickJsonFile(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error("No file selected."));
      try {
        const text = await file.text();
        resolve(JSON.parse(text));
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };

    input.click();
  });
}
