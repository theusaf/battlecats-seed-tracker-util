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
        extraPullNode = null;
        element;
        constructor(element) {
            this.element = element;
        }
        get catName() {
            return this.element.querySelector("a").textContent;
        }
        get leadsToName() {
            const outputNode = this.element.childNodes[3];
            if (outputNode?.textContent.trim()) {
                return outputNode.textContent.trim().match(/(\d+[ABR]+)/)[1];
            }
            else {
                return null;
            }
        }
    }
    const SINGLE_PULL_COST = 150;
    const ELEVEN_PULL_COST = 1500;
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
            if (distance < smallestDistance) {
                smallest = node;
                smallestDistance = distance;
            }
        }
        return smallest;
    }
    function djikstraSearch(graph, start) {
        const distances = new Map();
        const previous = new Map();
        const queue = new Set();
        for (const node of graph.nodes.values()) {
            distances.set(node, Infinity);
            previous.set(node, null);
            queue.add(node);
        }
        distances.set(start, 0);
        while (queue.size > 0) {
            const vertex = getSmallestVertex(distances, queue);
            queue.delete(vertex);
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
        let leftTrackStartIndex = 0, leftTrackEndLength = 0, rightTrackStartIndex = 0, rightTrackEndLength = 0, rowsizes = [].fill(0, 0, altNumber + 1), columnSkip = 0;
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
                const node = new TrackGraphNode(normal[j]);
                graph.addNode(node, `${i + 1}A${j === 0 ? "" : "R"}`);
            }
            for (let j = 0; j < guaranteed.length; j++) {
                const node = new TrackGraphNode(guaranteed[j]);
                graph.addNode(node, `${i + 1}A${j === 0 ? "" : "R"}G`);
            }
        }
        for (let i = 0; i < rightTrack.length; i++) {
            const [normal, guaranteed] = rightTrack[i];
            for (let j = 0; j < normal.length; j++) {
                const node = new TrackGraphNode(normal[j]);
                graph.addNode(node, `${i + 1}B${j === 0 ? "" : "R"}`);
            }
            for (let j = 0; j < guaranteed.length; j++) {
                const node = new TrackGraphNode(guaranteed[j]);
                graph.addNode(node, `${i + 1}B${j === 0 ? "" : "R"}G`);
            }
        }
        // connect all items
        for (let i = 0; i < leftTrack.length; i++) {
            const [normal] = leftTrack[i];
            for (let j = 0; j < normal.length; j++) {
                const node = graph.getNode(`${i + 1}A${j === 0 ? "" : "R"}`);
                const nodeCatName = node.catName;
                // normal pull
                const normalPullNextName = node.leadsToName ?? `${i + 2}A`;
                const normalPullNext = graph.getNode(normalPullNextName);
                if (normalPullNext) {
                    const normalPullNextCatName = normalPullNext.catName;
                    if (normalPullNextCatName === nodeCatName) {
                        const nextName = `${i + 2}AR`;
                        const next = graph.getNode(nextName);
                        if (next) {
                            node.neighbors.set(next, "normal");
                            node.extraPullNode = next;
                        }
                    }
                }
                // guaranteed pull
                const guaranteedPullNextName = node.leadsToName ?? `${i + 1}A${j === 0 ? "" : "R"}G`;
                const guaranteedPullNext = graph.getNode(guaranteedPullNextName);
                if (guaranteedPullNext) {
                    const guaranteedPullLinkName = guaranteedPullNext.leadsToName, guaranteedLink = graph.getNode(guaranteedPullLinkName);
                    const nameNumber = +guaranteedPullNextName.match(/(\d+)/)[1];
                    node.neighbors.set(guaranteedLink, nameNumber - (i + 1) === 11 ? "guaranteed11" : "guaranteed15");
                    graph.deleteNode(guaranteedPullNextName);
                }
            }
        }
        return graph;
    }
    const { leftTrack, rightTrack } = parseTable();
    const graph = generateGraph(leftTrack, rightTrack);
    const results = djikstraSearch(graph, graph.getNode("1A"));
}
