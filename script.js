document.addEventListener("DOMContentLoaded", () => {
    const yearNodes = document.querySelectorAll("[data-year]");
    yearNodes.forEach((node) => {
        node.textContent = new Date().getFullYear();
    });

    const loginForm = document.querySelector("[data-login-form]");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    const registerForm = document.querySelector("[data-register-form]");
    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }

    const fertilizerForm = document.querySelector("[data-fertilizer-form]");
    if (fertilizerForm) {
        updateRecommendation(fertilizerForm);
        fertilizerForm.addEventListener("input", () => updateRecommendation(fertilizerForm));
        fertilizerForm.addEventListener("change", () => updateRecommendation(fertilizerForm));
        fertilizerForm.addEventListener("submit", (event) => {
            event.preventDefault();
            updateRecommendation(fertilizerForm, true);
        });
    }
});

async function handleLogin(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const message = document.querySelector("[data-login-message]");
    const submitButton = form.querySelector('button[type="submit"]');
    const username = form.querySelector("#username").value.trim();
    const password = form.querySelector("#password").value;

    if (!message || !submitButton) {
        return;
    }

    message.textContent = "Signing in...";
    message.className = "login-message";
    submitButton.disabled = true;

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.message || "Login failed.");
        }

        message.textContent = "Login successful. Redirecting...";
        message.className = "login-message success";
        window.setTimeout(() => {
            window.location.href = "/home.html";
        }, 700);
    } catch (error) {
        message.textContent = error.message || "Could not reach the backend.";
        message.className = "login-message error";
    } finally {
        submitButton.disabled = false;
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const message = document.querySelector("[data-register-message]");
    const submitButton = form.querySelector('button[type="submit"]');
    const username = form.querySelector("#register-username").value.trim();
    const password = form.querySelector("#register-password").value;

    if (!message || !submitButton) {
        return;
    }

    message.textContent = "Creating account...";
    message.className = "login-message";
    submitButton.disabled = true;

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.message || "Registration failed.");
        }

        message.textContent = "Account created. Redirecting to login...";
        message.className = "login-message success";
        window.setTimeout(() => {
            window.location.href = "/login.html";
        }, 900);
    } catch (error) {
        message.textContent = error.message || "Could not reach the backend.";
        message.className = "login-message error";
    } finally {
        submitButton.disabled = false;
    }
}

function updateRecommendation(form, showConfirmation = false) {
    const plant = form.querySelector("#plant-type").value;
    const soil = form.querySelector("#soil-type").value;
    const climate = form.querySelector("#climate-type").value;

    const labels = [];
    const summaryParts = [];

    if (plant === "Vegetable") {
        labels.push("NPK balance");
        summaryParts.push("Vegetables usually respond well to a balanced feed.");
    } else if (plant === "Flower") {
        labels.push("Organic bloom mix");
        summaryParts.push("Flowers benefit from a softer nutrient profile with steady feeding.");
    } else {
        labels.push("Liquid boost");
        summaryParts.push("Leafy plants often like quick, light nutrition.");
    }

    if (soil === "Sandy") {
        labels.push("Organic matter");
        summaryParts.push("Sandy soil drains fast, so nutrients need extra help staying available.");
    } else if (soil === "Clay") {
        labels.push("Liquid fertilizer");
        summaryParts.push("Clay soil holds water longer, so lighter applications work better.");
    }

    if (climate.toLowerCase().includes("dry") || climate.toLowerCase().includes("hot")) {
        labels.push("Liquid foliar feed");
        summaryParts.push("Hot or dry climates usually benefit from gentler, faster uptake.");
    } else if (climate.toLowerCase().includes("humid") || climate.toLowerCase().includes("rain")) {
        labels.push("Slow-release granules");
        summaryParts.push("Humid or rainy weather can wash nutrients through faster.");
    }

    const chips = labels.length > 0 ? labels : ["Balanced feed", "Seasonal care"];
    const title = form.querySelector("[data-recommendation-title]");
    const body = form.querySelector("[data-recommendation-body]");
    const pills = form.querySelector("[data-recommendation-pills]");

    title.textContent = showConfirmation ? "Recommendation updated" : "Recommended fertilizer";
    body.textContent = summaryParts.join(" ");
    pills.innerHTML = chips.map((chip) => `<span class="pill">${chip}</span>`).join("");
}
