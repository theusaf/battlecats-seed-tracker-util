"use strict";
// ==UserScript==
// @name         BC Seed Tracker Util
// @namespace    https://好きな.みんな
// @version      1.0.0
// @description  Helps you find the optimal use of your tickets and cat food in BC Seed Tracker.
// @author       theusaf
// @match        *://*/*
// @license      MIT
// @grant        none
// @noframes
// ==/UserScript==
{
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
                function handleNewWanted(catName) {
                    if (cats.includes(catName) && !vertexDistance.hasCat(catName)) {
                        alt -= foundCatValue;
                        distance.virtualFoodUsed = alt;
                    }
                }
                // simulate pull
                switch (distanceType) {
                    case "normal": {
                        distance.addCat(neighbor.catName);
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
            let first = array[offset++];
            for (let subset of subsets(array, offset)) {
                subset.push(first);
                yield subset;
            }
        }
        yield [];
    }
    function multiSearch(graph, start, { cats, tickets, catFood, hasDiscount, foundCatValue = ELEVEN_PULL_COST, }) {
        const results = new Map();
        for (const subset of subsets(cats)) {
            if (subset.length === 0)
                continue;
            const result = graphSearch(graph, start, {
                cats: subset,
                tickets,
                catFood,
                hasDiscount,
                foundCatValue,
            });
            results.set(subset, result.get(subset.length)?.[0] ?? null);
        }
        return results;
    }
    const { leftTrack, rightTrack } = parseTable(), graph = generateGraph(leftTrack, rightTrack), results = multiSearch(graph, graph.getNode("1A"), {
        cats: ["Herme", "PPT48", "HMS Princess", "Calette"],
        tickets: 69,
        catFood: 4000,
        hasDiscount: true,
        // foundCatValue: 0,
    });
    window.results = results;
}
