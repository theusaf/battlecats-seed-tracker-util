# Battle Cats Seed Tracker Utility

## What is this?
This is a helper utility for Godfat's [Battle Cats Seed Tracker](https://bc.godfat.org). It adds a widget at the top to easily find potential paths to get the cats you want.

## Installation
1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Install the script from [Greasy Fork](https://greasyfork.org/en/scripts/480239-bc-seed-tracker-util).
  - This can be done by pressing the "Install this script" button on the page.

## Usage
* To access the utility, click the "BC Seed Tracker Util" button at the top of the page.
* Configure it by filling out the options (shown below). Options are saved when you calculate paths.
* Press the "Calculate Paths" button to find paths to the cats you want.

### Options

**Has Discount** - Whether or not you have the 'starter' discount. This will let the algorithm know to take into account the discount when calculating the overall cost.

**Tickets** - The number of tickets you have. When simulating regular pulls, tickets are used first before cat food.

**Cat Food** - The number of catfood you have. Used for normal and guaranteed pulls.

**Ticket Value** - The value of a ticket in cat food. By default, it is set to 150. If you have a lot of tickets and want to prioritize using them before cat food, you can set this to a lower value. Sometimes, with high values, certain paths may not be discovered by the algorithm.

**Select** - The unique cats you are searching for. You need at least one.

## Output
All search results will be displayed under the options. Each item is sorted by number of cats. Smaller subsets of the requested cats are also displayed.

Cat names are color-coded based on their rarity. The colors are as follows:
* Rare - White
* Super Rare - Blue
* Uber Super Rare - Purple
* Legend Rare - Red

Next to the cat names are the remaining cat food (in red)
and tickets (in yellow) after pulling.

The final line shows the steps needed to get the cats. The format looks like so:
```
4 pulls, 1 guaranteed pull, 8 pulls, 2 guaranteed pulls
```
This means to use 4 normal pulls/tickets, then 1 guaranteed pull, then 8 normal pulls/tickets, then 2 guaranteed pulls in a row.
