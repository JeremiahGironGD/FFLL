import { levels } from "./levels.js";

const container = document.getElementById("level-list");

levels.forEach(level => {

    const card = document.createElement("a");

    card.className = `level-card ${level.tier}`;
    card.href = level.url;

    card.innerHTML = `
        <span class="label">#${level.rank}</span>
        <span class="title">${level.title}</span>
        <span class="points-label">
            Points: ${level.points}
        </span>
    `;

    container.appendChild(card);

});