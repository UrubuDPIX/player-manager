const nbt = require('nbt');

const data = {
    type: 'compound',
    name: 'Player',
    value: {
        Inventory: {
            type: 'list',
            value: {
                type: 'compound',
                value: [
                    {
                        Slot: { type: 'byte', value: 0 },
                        id: { type: 'string', value: 'minecraft:stone' },
                        Count: { type: 'byte', value: 64 }
                    }
                ]
            }
        }
    }
};

const buf = Buffer.alloc(1024);
const writer = new nbt.Writer();
writer.compound(data);
const buffer = writer.getData();

nbt.parse(buffer, (err, parsed) => {
    console.log(JSON.stringify(parsed, null, 2));
});
