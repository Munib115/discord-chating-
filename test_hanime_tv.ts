async function testHanimeTV() {
  try {
    const res = await fetch("https://hanime.tv/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    console.log("hanime.tv status:", res.status);
    console.log("HTML length:", (await res.text()).length);
  } catch (err) {
    console.error("hanime.tv failed:", err);
  }
}

testHanimeTV();
