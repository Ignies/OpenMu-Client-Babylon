import { ItemsDatabase } from '../src/common/itemsDatabase';
import { ItemGroups } from '../src/common/objects/enum';

const itemFile = await Bun.file('Item.txt').text();

const lines = itemFile
  .split('\n')
  .map(line => line.replace(/\r/g, '').trim())
  .filter(Boolean); // Remove carriage returns

// 1. first, lets find a line which can be parsed as a Integer(group index)
// 2. the line before that is the header with the names of each column
// 3. the line after that is the data
// 4. the data is a list of objects with the names of the columns as keys
// 5. read data until the line content equals to "end"

interface ItemGroup {
  groupIndex: number;
  groupName: string;
  header: string[];
  items: Record<string, any>[];
}

const result: ItemGroup[] = [];

function extractValues(line: string) {
  // Tokens are runs of non-whitespace, or a double-quoted string (names
  // with spaces). Splitting on single characters injected empty values
  // after every quoted name and shifted every stat column by two.
  const values: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    values.push(m[1] !== undefined ? m[1] : m[2]);
  }
  return values;
}

let lineIndex = 0;
while (lineIndex < lines.length) {
  const line = lines[lineIndex];

  // Try to parse as integer (group index)
  const groupIndex = parseInt(line);
  if (!isNaN(groupIndex) && groupIndex.toString() === line) {
    // Found group index, now get header and data
    const headerLine = lines[lineIndex - 1].substring(2).replaceAll('\t', ' ');

    // Extract group name from comment line before header
    //@ts-ignore
    const groupName = ItemGroups[groupIndex] ?? `Group ${groupIndex}`;

    // Parse header - split by tabs and clean up
    const header = headerLine
      .split(' ')
      .map(h => h.trim())
      .filter(Boolean);

    // Parse data items
    const items: Record<string, any>[] = [];
    lineIndex++; // Move to first data line

    while (lineIndex < lines.length && lines[lineIndex] !== 'end') {
      const dataLine = lines[lineIndex];
      if (!dataLine || dataLine.startsWith('//')) {
        lineIndex++;
        continue;
      }

      const values = extractValues(dataLine);
      const item: Record<string, any> = {};

      item.Group = groupIndex;

      // Map each value to its corresponding header
      for (let columnIndex = 0; columnIndex < header.length; columnIndex++) {
        const headerKey = header[columnIndex];
        let value: string | number = values[columnIndex];

        // Clean up the value
        if (typeof value === 'string') {
          value = value.trim();

          // Remove quotes from strings
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }

          // Try to parse as number
          if (!isNaN(Number(value))) {
            value = Number(value);
          }
        }

        item[headerKey] = value;
      }

      const config = ItemsDatabase.getItem(item.Group, item.Index);
      if (config) {
        item.szModelFolder = config.szModelFolder;
        item.szModelName = config.szModelName;
      } else {
        item.szModelFolder = 'Item/';
        item.szModelName = 'rollofpaper.glb';
      }

      items.push(item);

      lineIndex++;
    }

    result.push({
      groupIndex,
      groupName,
      header,
      items,
    });
  }

  lineIndex++;
}

// Write result to JSON file
await Bun.write(
  'items.json',
  JSON.stringify(
    result.flatMap(g => g.items),
    null,
    2
  )
);
