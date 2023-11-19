"use strict";
// ==UserScript==
// @name         BC Seed Tracker Util
// @namespace    https://好きな.みんな
// @version      1.0.0
// @description  Helps you find the optimal use of your tickets and cat food in BC Seed Tracker.
// @author       theusaf
// @match        https://bc.godfat.org/
// @icon         https://bc.godfat.org/asset/image/treasure.png
// @license      MIT
// @grant        none
// @noframes
// ==/UserScript==
(() => {
    class TrackGraph {
        nodes = new Map();
        addNode(node, name) {
            this.nodes.set(name, node);
        }
        getNode(name) {
            return this.nodes.get(name);
        }
        deleteNode(name) {
            this.nodes.delete(name);
        }
    }
    class TrackGraphNode {
        neighbors = new Map();
        nextNormalPullNode = null;
        element;
        name;
        constructor(element, name) {
            this.element = element;
            this.name = name;
        }
        get catName() {
            return this.element.querySelector("a").textContent;
        }
        get leadsToName() {
            try {
                const outputNodeRight = this.element.childNodes[3], outputNodeLeft = this.element.childNodes[0];
                if (outputNodeRight?.textContent.trim()) {
                    return outputNodeRight.textContent.trim().match(/(\d+[ABR]+)/)[1];
                }
                else if (outputNodeLeft?.textContent.trim()) {
                    return outputNodeLeft.textContent.trim().match(/(\d+[ABR]+)/)[1];
                }
                else {
                    return null;
                }
            }
            catch (e) {
                // probably a <?>
                return null;
            }
        }
    }
    // initial processing (convert DOM into arrays)
    function parseTable() {
        const header = document.querySelector("table tr:first-child"), itemsWanted = ["no.", "result", "score, slot", "guaranteed"], [mainNumber, mainResult, mainGuaranteed, altResult, altGuaranteed, altNumber,] = [...header.children]
            .map((child, i) => [i, child.textContent])
            .filter((data) => itemsWanted.find((item) => data[1].toLowerCase().includes(item.toLowerCase())))
            .map(([i]) => i);
        const rows = document.querySelectorAll("table tr:not(:first-child)");
        let leftTrackNumber = 0, rightTrackNumber = 0;
        const leftTrack = [], rightTrack = [];
        let leftTrackStartIndex = 0, leftTrackEndLength = 0, rightTrackStartIndex = 0, rightTrackEndLength = 0, columnSkip = 0;
        const rowsizes = [].fill(0, 0, altNumber + 1);
        for (let r = 0; r < rows.length; r++) {
            if (leftTrackStartIndex - r + leftTrackEndLength < 0 ||
                leftTrackNumber === 0) {
                leftTrackStartIndex = r;
                leftTrackEndLength = 0;
                leftTrackNumber++;
            }
            if (rightTrackStartIndex - r + rightTrackEndLength < 0 ||
                rightTrackNumber === 0) {
                rightTrackStartIndex = r;
                rightTrackEndLength = 0;
                rightTrackNumber++;
            }
            const row = rows[r];
            let i = 0; // actual element index
            for (let c = 0; c <= altNumber; c++) {
                if (columnSkip > 0) {
                    columnSkip--;
                    if (c === mainNumber)
                        leftTrackNumber--;
                    if (c === altNumber)
                        rightTrackNumber--;
                    continue;
                }
                if (rowsizes[c] > 0) {
                    rowsizes[c]--;
                    continue;
                }
                const cell = row.children[i];
                i++;
                switch (c) {
                    case mainNumber: {
                        leftTrackStartIndex = r;
                        leftTrackEndLength = +cell.getAttribute("rowspan") - 1;
                        break;
                    }
                    case altNumber: {
                        rightTrackStartIndex = r;
                        rightTrackEndLength = +cell.getAttribute("rowspan") - 1;
                        break;
                    }
                    case mainResult: {
                        if (cell.classList.contains("cat") &&
                            cell.classList.contains("pick")) {
                            if (leftTrack[leftTrackNumber - 1]) {
                                leftTrack[leftTrackNumber - 1][0].push(cell);
                            }
                            else {
                                leftTrack[leftTrackNumber - 1] = [[cell], []];
                            }
                        }
                        break;
                    }
                    case mainGuaranteed: {
                        if (cell.classList.contains("cat") &&
                            cell.classList.contains("pick")) {
                            leftTrack[leftTrackNumber - 1][1].push(cell);
                        }
                        break;
                    }
                    case altResult: {
                        if (cell.classList.contains("cat") &&
                            cell.classList.contains("pick")) {
                            if (rightTrack[rightTrackNumber - 1]) {
                                rightTrack[rightTrackNumber - 1][0].push(cell);
                            }
                            else {
                                rightTrack[rightTrackNumber - 1] = [[cell], []];
                            }
                        }
                        break;
                    }
                    case altGuaranteed: {
                        if (cell.classList.contains("cat") &&
                            cell.classList.contains("pick")) {
                            rightTrack[rightTrackNumber - 1][1].push(cell);
                        }
                        break;
                    }
                }
                const rowspan = +(cell.getAttribute("rowspan") ?? 1), colspan = +(cell.getAttribute("colspan") ?? 1);
                if (rowspan > 1) {
                    rowsizes[c] = rowspan - 1;
                }
                if (colspan > 1) {
                    columnSkip = colspan - 1;
                }
            }
        }
        return { leftTrack, rightTrack };
    }
    function generateGraph(leftTrack, rightTrack) {
        const graph = new TrackGraph();
        // nodify all items
        for (let i = 0; i < leftTrack.length; i++) {
            const [normal, guaranteed] = leftTrack[i];
            for (let j = 0; j < normal.length; j++) {
                const name = `${i + 1}A${j === 0 ? "" : "R"}`, node = new TrackGraphNode(normal[j], name);
                graph.addNode(node, name);
            }
            for (let j = 0; j < guaranteed.length; j++) {
                const name = `${i + 1}A${j === 0 ? "" : "R"}G`, node = new TrackGraphNode(guaranteed[j], name);
                graph.addNode(node, name);
            }
        }
        for (let i = 0; i < rightTrack.length; i++) {
            const [normal, guaranteed] = rightTrack[i];
            for (let j = 0; j < normal.length; j++) {
                const name = `${i + 1}B${j === 0 ? "" : "R"}`, node = new TrackGraphNode(normal[j], name);
                graph.addNode(node, name);
            }
            for (let j = 0; j < guaranteed.length; j++) {
                const name = `${i + 1}B${j === 0 ? "" : "R"}G`, node = new TrackGraphNode(guaranteed[j], name);
                graph.addNode(node, name);
            }
        }
        // connect all items
        for (let i = 0; i < leftTrack.length; i++) {
            const [normal] = leftTrack[i];
            for (let j = 0; j < normal.length; j++) {
                const node = graph.getNode(`${i + 1}A${j === 0 ? "" : "R"}`), nodeCatName = node.catName;
                // normal pull
                const normalPullNextName = node.leadsToName ?? `${i + 2}A`, normalPullNext = graph.getNode(normalPullNextName);
                if (normalPullNext) {
                    const normalPullNextCatName = normalPullNext.catName;
                    if (normalPullNextCatName === nodeCatName) {
                        const nextName = `${i + 2}AR`, next = graph.getNode(nextName);
                        if (next) {
                            node.neighbors.set(next, "normal");
                            node.nextNormalPullNode = next;
                        }
                    }
                    else {
                        node.neighbors.set(normalPullNext, "normal");
                        node.nextNormalPullNode = normalPullNext;
                    }
                }
                // guaranteed pull
                const guaranteedPullName = `${node.name}G`, guaranteedPullNext = graph.getNode(guaranteedPullName);
                if (guaranteedPullNext) {
                    const guaranteedPullLinkName = guaranteedPullNext.leadsToName, guaranteedLink = graph.getNode(guaranteedPullLinkName), nameNumber = +guaranteedPullLinkName.match(/(\d+)/)[1];
                    guaranteedPullNext.nextNormalPullNode = guaranteedLink ?? null;
                    node.neighbors.set(guaranteedPullNext, nameNumber - (i + 1) <= 12 ? "guaranteed11" : "guaranteed15");
                }
            }
        }
        for (let i = 0; i < rightTrack.length; i++) {
            const [normal] = rightTrack[i];
            for (let j = 0; j < normal.length; j++) {
                const node = graph.getNode(`${i + 1}B${j === 0 ? "" : "R"}`);
                const nodeCatName = node.catName;
                // normal pull
                const normalPullNextName = node.leadsToName ?? `${i + 2}B`;
                const normalPullNext = graph.getNode(normalPullNextName);
                if (normalPullNext) {
                    const normalPullNextCatName = normalPullNext.catName;
                    if (normalPullNextCatName === nodeCatName) {
                        const nextName = `${i + 2}BR`;
                        const next = graph.getNode(nextName);
                        if (next) {
                            node.neighbors.set(next, "normal");
                            node.nextNormalPullNode = next;
                        }
                    }
                    else {
                        node.neighbors.set(normalPullNext, "normal");
                        node.nextNormalPullNode = normalPullNext;
                    }
                }
                // guaranteed pull
                const guaranteedPullName = `${node.name}G`;
                const guaranteedPullNext = graph.getNode(guaranteedPullName);
                if (guaranteedPullNext) {
                    const guaranteedPullLinkName = guaranteedPullNext.leadsToName, guaranteedLink = graph.getNode(guaranteedPullLinkName);
                    const nameNumber = +guaranteedPullLinkName.match(/(\d+)/)[1];
                    node.neighbors.set(guaranteedLink, nameNumber - (i + 1) <= 12 ? "guaranteed11" : "guaranteed15");
                    graph.deleteNode(guaranteedPullName);
                }
            }
        }
        return graph;
    }
    class Distance {
        ticketsLeft;
        catFoodLeft;
        virtualFoodUsed;
        catsFound = new Set();
        constructor(ticketsLeft, catFoodLeft, initialValue = 0) {
            this.ticketsLeft = ticketsLeft;
            this.catFoodLeft = catFoodLeft;
            this.virtualFoodUsed = initialValue;
        }
        getValue() {
            return this.virtualFoodUsed;
        }
        addCat(catName) {
            this.catsFound.add(catName);
        }
        hasCat(catName) {
            return this.catsFound.has(catName);
        }
        getCats() {
            return [...this.catsFound];
        }
    }
    const SINGLE_PULL_COST = 150;
    const SINGLE_PULL_COST_DISCOUNT = 30;
    const ELEVEN_PULL_COST = 1500;
    const ELEVEN_PULL_COST_DISCOUNT = 750;
    const FIFTEEN_PULL_COST = 2100;
    function getCost(type) {
        switch (type) {
            case "normal":
                return SINGLE_PULL_COST;
            case "guaranteed11":
                return ELEVEN_PULL_COST;
            case "guaranteed15":
                return FIFTEEN_PULL_COST;
        }
    }
    function getSmallestVertex(distances, queue) {
        let smallest = null;
        let smallestDistance = Infinity;
        for (const node of queue) {
            const distance = distances.get(node);
            if (distance.getValue() < smallestDistance) {
                smallest = node;
                smallestDistance = distance.getValue();
            }
        }
        return smallest;
    }
    function getPath(previous, start, end) {
        const path = [];
        let current = end;
        while (current !== start) {
            path.push(current);
            current = previous.get(current);
        }
        path.push(start);
        path.reverse();
        return path;
    }
    // a modified version of Dijkstra's algorithm
    // somewhat like a star search
    function graphSearch(graph, start, { cats, tickets, catFood, hasDiscount, foundCatValue = ELEVEN_PULL_COST, }) {
        if (cats.length === 0) {
            throw new Error("There must be at least one cat to search for.");
        }
        if (hasDiscount) {
            catFood += ELEVEN_PULL_COST - ELEVEN_PULL_COST_DISCOUNT;
            catFood += SINGLE_PULL_COST - SINGLE_PULL_COST_DISCOUNT;
        }
        const distances = new Map();
        const previous = new Map();
        const queue = new Set();
        for (const node of graph.nodes.values()) {
            distances.set(node, new Distance(tickets, catFood, Infinity));
            previous.set(node, null);
            queue.add(node);
        }
        distances.set(start, new Distance(tickets, catFood, 0));
        const catSetsFound = new Map();
        while (queue.size > 0) {
            const vertex = getSmallestVertex(distances, queue);
            // probably out of "resources"
            if (!vertex)
                break;
            queue.delete(vertex);
            // check cats found!
            const catsFound = distances
                .get(vertex)
                .getCats()
                .filter((cat) => cats.includes(cat));
            if (catsFound.length > 0) {
                if (!catSetsFound.has(catsFound.length)) {
                    catSetsFound.set(catsFound.length, []);
                }
                const catLengthSets = catSetsFound.get(catsFound.length);
                let found = false;
                for (const catSet of catLengthSets) {
                    if (catsFound.every((cat) => catSet.cats.has(cat))) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // adjust distance output
                    const distance = distances.get(vertex), path = getPath(previous, start, vertex);
                    if (hasDiscount) {
                        if (distance.ticketsLeft > 0) {
                            distance.catFoodLeft -=
                                SINGLE_PULL_COST - SINGLE_PULL_COST_DISCOUNT;
                        }
                        // scan for any guaranteed pulls
                        let found = false;
                        for (let i = 1; i < path.length; i++) {
                            const node = path[i], prev = path[i - 1];
                            if (prev.neighbors.get(node) === "guaranteed11") {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            distance.catFoodLeft -=
                                ELEVEN_PULL_COST - ELEVEN_PULL_COST_DISCOUNT;
                        }
                    }
                    catLengthSets.push({
                        cats: new Set(catsFound),
                        path,
                        finalDistance: distance,
                    });
                }
                if (catSetsFound.size === cats.length) {
                    // we found all cats!
                    console.log("found all cats!");
                    break;
                }
            }
            for (const [neighbor, distanceType] of vertex.neighbors.entries()) {
                if (!queue.has(neighbor))
                    continue;
                const cost = getCost(distanceType), vertexDistance = distances.get(vertex);
                let tickets = vertexDistance.ticketsLeft, catFood = vertexDistance.catFoodLeft;
                // handle initial pull (including start)
                if (distanceType === "normal" && vertex.name === "1A") {
                    if (tickets > 0)
                        tickets--;
                    else
                        catFood -= cost;
                    if (tickets > 0)
                        tickets--;
                    else
                        catFood -= cost;
                }
                else if (distanceType === "normal" && tickets > 0) {
                    tickets--;
                }
                else {
                    catFood -= cost;
                }
                let alt = vertexDistance.getValue() + cost;
                if (catFood < 0)
                    alt = Infinity;
                const distance = new Distance(tickets, catFood, alt), currentCats = vertexDistance.getCats();
                for (const cat of currentCats) {
                    distance.addCat(cat);
                }
                // heuristic for finding wanted cats
                const handleNewWanted = (catName) => {
                    if (cats.includes(catName) && !vertexDistance.hasCat(catName)) {
                        alt -= foundCatValue;
                        distance.virtualFoodUsed = alt;
                    }
                };
                // simulate pull
                switch (distanceType) {
                    case "normal": {
                        distance.addCat(vertex.catName);
                        handleNewWanted(neighbor.catName);
                        break;
                    }
                    case "guaranteed11": {
                        distance.addCat(neighbor.catName);
                        let start = vertex;
                        for (let i = 0; i < 10; i++) {
                            if (!start)
                                break;
                            distance.addCat(start.catName);
                            handleNewWanted(start.catName);
                            start = start.nextNormalPullNode;
                        }
                        break;
                    }
                    case "guaranteed15": {
                        distance.addCat(neighbor.catName);
                        let start = vertex;
                        for (let i = 0; i < 14; i++) {
                            if (!start)
                                break;
                            distance.addCat(start.catName);
                            handleNewWanted(start.catName);
                            start = start.nextNormalPullNode;
                        }
                        break;
                    }
                }
                if (alt < distances.get(neighbor).getValue()) {
                    // update distances
                    distances.set(neighbor, distance);
                    previous.set(neighbor, vertex);
                }
            }
        }
        return catSetsFound;
    }
    function* subsets(array, offset = 0) {
        while (offset < array.length) {
            const first = array[offset++];
            for (const subset of subsets(array, offset)) {
                subset.push(first);
                yield subset;
            }
        }
        yield [];
    }
    function multiSearch(graph, start, { cats, tickets, catFood, hasDiscount, }) {
        const results = new Map(), foundCatValues = [0, ELEVEN_PULL_COST, FIFTEEN_PULL_COST];
        for (const subset of subsets(cats)) {
            if (subset.length === 0)
                continue;
            for (const foundCatValue of foundCatValues) {
                const result = graphSearch(graph, start, {
                    cats: subset,
                    tickets,
                    catFood,
                    hasDiscount,
                    foundCatValue,
                }), lengthResult = result.get(subset.length);
                if (lengthResult) {
                    results.set(subset, lengthResult[0] ?? null);
                    break;
                }
                else {
                    results.set(subset, null);
                }
            }
        }
        return results;
    }
    function htmlEntities(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
    const ui = document.createElement("template");
    ui.innerHTML = `
    <style>
      #bstu-main {
        position: fixed;
        top: 0;
        right: 0;
        background: grey;
        padding: 0.5rem;
        max-width: 25rem;
        max-height: 100vh;
        overflow: auto;
      }
      .bstu-choice {
        background: #eee;
        border-radius: 0.5rem;
        padding: 0.25rem;
        margin: 0.25rem;
      }
      #bstu-choices {
        display: flex;
        flex-wrap: wrap;
      }
      .bstu-result {
        background: darkgray;
        border-radius: 0.5rem;
        margin: 0.25rem;
        padding: 0.25rem;
      }
      .bstu-result-cats {
        font-weight: bold;
      }
      .bstu-result-distance-food {
        border-radius: 0.5rem;
        background: red;
        color: white;
        padding: 0.1rem;
      }
      .bstu-result-distance-tickets {
        border-radius: 0.5rem;
        background: gold;
        padding: 0.1rem;
      }

      .bstu-rarity-rare {
        color: white;
      }
      .bstu-rarity-super {
        color: blue;
      }
      .bstu-rarity-uber {
        color: purple;
      }
      .bstu-rarity-legend {
        color: red;
      }
    </style>
    <div id="bstu-main">
      <details>
        <summary>BC Seed Tracker Util</summary>
        <div>
          <div>
            <div>
              <label for="bstu-discount">Has Discount</label>
              <input type="checkbox" id="bstu-discount" />
            </div>
            <div>
              <label for="bstu-tickets">Tickets</label>
              <input type="number" id="bstu-tickets" />
            </div>
            <div>
              <label for="bstu-cat-food">Cat Food</label>
              <input type="number" id="bstu-cat-food" />
            </div>
          </div>
          <select id="bstu-selector"></select>
          <button id="bstu-start-button">Calculate Paths</button>
        </div>
        <div id="bstu-choices">
        </div>
        <hr />
        <div id="bstu-results">
        </div>
      </details>
    </div>
  `;
    document.body.appendChild(ui.content.cloneNode(true));
    setTimeout(() => {
        // copy available cats
        const selector = document.querySelector("#bstu-selector"), choicesArea = document.querySelector("#bstu-choices"), resultsArea = document.querySelector("#bstu-results"), startButton = document.querySelector("#bstu-start-button"), discountCheckbox = document.querySelector("#bstu-discount"), ticketsInput = document.querySelector("#bstu-tickets"), catFoodInput = document.querySelector("#bstu-cat-food"), providedCatSelector = document.querySelector("#find_select"), options = providedCatSelector.cloneNode(true)
            .children;
        selector.append(...options);
        selector.value = "";
        const choices = new Set();
        function addChoice(cat) {
            if (choices.has(cat))
                return;
            choices.add(cat);
            const choice = document.createElement("span");
            choice.innerHTML = `
        <span class="bstu-choice-name">${cat}</span>
        <span class="bstu-choice-remove">x</span>
      `;
            choice.className = "bstu-choice";
            const node = choice.cloneNode(true);
            choicesArea.append(node);
            node
                .querySelector(".bstu-choice-remove")
                .addEventListener("click", () => {
                choices.delete(cat);
                node.remove();
            });
        }
        function getRarity(cat) {
            const option = [
                ...selector.querySelectorAll("option"),
            ].find((option) => option.textContent === cat), optGroup = option.parentElement;
            return optGroup.label.match(/\w+/)[0].toLowerCase();
        }
        function saveToLocalStore() {
            localStorage.setItem("bstu-data", JSON.stringify({
                cats: [...choices],
                tickets: ticketsInput.value,
                catFood: catFoodInput.value,
                hasDiscount: discountCheckbox.checked,
            }));
        }
        function loadFromLocalStore() {
            const data = JSON.parse(localStorage.getItem("bstu-data") ?? "{}");
            choices.clear();
            for (const cat of data.cats ?? []) {
                if (![...selector.options].find((option) => option.textContent === cat)) {
                    continue;
                }
                addChoice(cat);
            }
            ticketsInput.value = data.tickets ?? "";
            catFoodInput.value = data.catFood ?? "";
            discountCheckbox.checked = data.hasDiscount ?? false;
        }
        loadFromLocalStore();
        selector.addEventListener("change", () => {
            if (!selector.value)
                return;
            addChoice(selector.options[selector.selectedIndex].textContent);
            setTimeout(() => (selector.value = ""));
        });
        startButton.addEventListener("click", () => {
            resultsArea.innerHTML = "";
            setTimeout(() => {
                const { leftTrack, rightTrack } = parseTable(), graph = generateGraph(leftTrack, rightTrack), results = multiSearch(graph, graph.getNode("1A"), {
                    cats: [...choices],
                    tickets: ticketsInput.valueAsNumber,
                    catFood: catFoodInput.valueAsNumber || Infinity,
                    hasDiscount: discountCheckbox.checked,
                });
                saveToLocalStore();
                console.log(results);
                // generate output
                for (const [catList, result] of [...results.entries()].sort(([a], [b]) => b.length - a.length)) {
                    const resultDiv = document.createElement("div");
                    resultDiv.className = "bstu-result";
                    if (result) {
                        const { path, finalDistance } = result, simplifiedPath = [];
                        let currentPullType = null, currentPullCount = 0;
                        for (let i = 1; i < path.length; i++) {
                            const prev = path[i - 1], current = path[i], type = prev.neighbors.get(current);
                            if (type === currentPullType) {
                                currentPullCount++;
                            }
                            else {
                                if (currentPullType) {
                                    simplifiedPath.push({
                                        type: currentPullType === "normal" ? "normal" : "guaranteed",
                                        count: currentPullCount,
                                    });
                                }
                                currentPullType = type;
                                currentPullCount = 1;
                            }
                        }
                        if (currentPullType) {
                            simplifiedPath.push({
                                type: currentPullType === "normal" ? "normal" : "guaranteed",
                                count: currentPullCount,
                            });
                        }
                        resultDiv.innerHTML = `
              <div>
                <span class="bstu-result-cats">${catList
                            .map((cat) => `<span class="bstu-rarity-${getRarity(cat)}">${htmlEntities(cat)}</span>`)
                            .join(", ")}</span>
                <span class="bstu-result-distance">
                  <span class="bstu-result-distance-food" title="remaining cat food">${finalDistance.catFoodLeft}</span>
                  <span class="bstu-result-distance-tickets" title="remaining tickets">${finalDistance.ticketsLeft}</span>
                </span>
              </div>
              <div>
                <span class="bstu-result-path" data-path="${htmlEntities(path
                            .map((node) => `${node.catName} (${node.name})`)
                            .join(" > "))}">
                ${simplifiedPath
                            .map((pull) => `${pull.count} ${pull.type === "normal" ? "pull" : "guaranteed pull"}${pull.count > 1 ? "s" : ""}`)
                            .join(", ")}
                </span>
              </div>
            `;
                        setTimeout(() => {
                            resultDiv
                                .querySelector(".bstu-result-path")
                                .addEventListener("click", (e) => {
                                // copy path to clipboard
                                const path = e.target.getAttribute("data-path");
                                navigator.clipboard.writeText(path);
                                alert("Copied path to clipboard!");
                            });
                        });
                    }
                    else {
                        resultDiv.innerHTML = `
              <div>
                <span class="bstu-result-cats">${catList
                            .map((cat) => `<span class="bstu-rarity-${getRarity(cat)}">${htmlEntities(cat)}</span>`)
                            .join(", ")}</span>
              </div>
              <div>
                <span class="bstu-result-path">No path found</span>
              </div>
            `;
                    }
                    resultsArea.append(resultDiv);
                }
            }, 500);
        });
    });
})();
