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
  nodes: Map<string, TrackGraphNode> = new Map();

  addNode(node: TrackGraphNode, name: string) {
    this.nodes.set(name, node);
  }
}

type ConnectionType = "normal" | "guaranteed11" | "guaranteed15";

class TrackGraphNode {
  neighbors: Map<TrackGraphNode, ConnectionType> = new Map();
  extraPullNode: TrackGraphNode | null = null;
  element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }
}

const SINGLE_PULL_COST = 150;
const ELEVEN_PULL_COST = 1500;
const FIFTEEN_PULL_COST = 2100;

function djikstraSearch(graph: TrackGraph, start: TrackGraphNode) {}

type Track = [[HTMLElement, HTMLElement?], [HTMLElement?, HTMLElement?]];

// initial processing (convert DOM into arrays)
function parseTable() {
  const header = document.querySelector<HTMLTableRowElement>(
      "table tr:first-child"
    ),
    itemsWanted = ["no.", "result", "score, slot", "guaranteed"],
    [
      mainNumber,
      mainResult,
      mainGuaranteed,
      altResult,
      altGuaranteed,
      altNumber,
    ] = [...header!.children]
      .map((child, i) => [i, child.textContent])
      .filter((data) =>
        itemsWanted.find((item) =>
          (data[1] as string)!.toLowerCase().includes(item.toLowerCase())
        )
      )
      .map(([i]) => i) as number[];

  const rows = document.querySelectorAll<HTMLTableRowElement>(
    "table tr:not(:first-child)"
  );
  let leftTrackNumber = 0,
    rightTrackNumber = 0;
  const leftTrack: Track[] = [],
    rightTrack: Track[] = [];
  let leftTrackStartIndex = 0,
    leftTrackEndLength = 0,
    rightTrackStartIndex = 0,
    rightTrackEndLength = 0,
    rowsizes: number[] = ([] as number[]).fill(0, 0, altNumber + 1),
    columnSkip = 0;
  for (let r = 0; r < rows.length; r++) {
    if (leftTrackStartIndex - r + leftTrackEndLength < 0 || leftTrackNumber === 0) {
      leftTrackStartIndex = r;
      leftTrackEndLength = 0;
      leftTrackNumber++;
    }
    if (rightTrackStartIndex - r + rightTrackEndLength < 0 || rightTrackNumber === 0) {
      rightTrackStartIndex = r;
      rightTrackEndLength = 0;
      rightTrackNumber++;
    }
    const row = rows[r];
    let i = 0; // actual element index
    for (let c = 0; c <= altNumber; c++) {
      if (columnSkip > 0) {
        columnSkip--;
        if (c === mainNumber) leftTrackNumber--;
        if (c === altNumber) rightTrackNumber--;
        continue;
      }
      if (rowsizes[c] > 0) {
        rowsizes[c]--;
        continue;
      }
      const cell = row.children[i] as HTMLElement;
      i++;
      switch (c) {
        case mainNumber: {
          leftTrackStartIndex = r;
          leftTrackEndLength = +cell.getAttribute("rowspan")! - 1;
          break;
        }
        case altNumber: {
          rightTrackStartIndex = r;
          rightTrackEndLength = +cell.getAttribute("rowspan")! - 1;
          break;
        }
        case mainResult: {
          if (cell.classList.contains("cat") && cell.classList.contains("pick")) {
            if (leftTrack[leftTrackNumber - 1]) {
              leftTrack[leftTrackNumber - 1][0].push(cell);
            } else {
              leftTrack[leftTrackNumber - 1] = [[cell], []];
            }
          }
          break;
        }
        case mainGuaranteed: {
          if (cell.classList.contains("cat") && cell.classList.contains("pick")) {
            leftTrack[leftTrackNumber - 1][1].push(cell);
          }
          break;
        }
        case altResult: {
          if (cell.classList.contains("cat") && cell.classList.contains("pick")) {
            if (rightTrack[rightTrackNumber - 1]) {
              rightTrack[rightTrackNumber - 1][0].push(cell);
            } else {
              rightTrack[rightTrackNumber - 1] = [[cell], []];
            }
          }
          break;
        }
        case altGuaranteed: {
          if (cell.classList.contains("cat") && cell.classList.contains("pick")) {
            rightTrack[rightTrackNumber - 1][1].push(cell);
          }
          break;
        }
      }
      const rowspan = +(cell.getAttribute("rowspan") ?? 1),
        colspan = +(cell.getAttribute("colspan") ?? 1);
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

function generateGraph(leftTrack: Track, rightTrack: Track) {
  const graph = new TrackGraph();

  // nodify all items
  for (let i = 0; i < leftTrack.length; i++) {}
  for (let i = 0; i < rightTrack.length; i++) {}
}

console.log(parseTable());

}
