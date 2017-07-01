slarver
=======

This nodejs module will take one stream and split it up into multiple smaller
streams with redundant parts (called "fragments"). To join the fragment
streams together to the original stream, you will only need a subset of the
fragments, since they overlap some data.

For example, to split one stream into five fragment streams, and then use
three of those fragments for recreating to original stream:

```
const Slarver = require('slarver');

const slarver = new Slarver.Split(5, 3);
// First argument in the class constructor is the number of fragments to
// create, and the second argument is how many of the fragments you would
// need to recreate the original data.

fs.createReadStream('example.blob').pipe(slarver);

slarver.splits[0].pipe(fs.createWriteStream('example.blob-fragment0'));
slarver.splits[1].pipe(fs.createWriteStream('example.blob-fragment1'));
slarver.splits[2].pipe(fs.createWriteStream('example.blob-fragment2'));
slarver.splits[3].pipe(fs.createWriteStream('example.blob-fragment3'));
slarver.splits[4].pipe(fs.createWriteStream('example.blob-fragment4'));
```

To join three of those streams together into the original stream:

```
const Slarver = require('slarver');

const slarver = new Slarver.Join();

// You can use any three of the five fragments, in any order:
slarver.source(fs.createReadStream('example.blob-fragment4'));
slarver.source(fs.createReadStream('example.blob-fragment1'));
slarver.source(fs.createReadStream('example.blob-fragment3'));

slarver.pipe(fw.createWriteStream('example.blob-copy'));
```

## The `Slarver.Split` Class

The `Slarver.Split` Class implements a Writable Stream.

## The `Slarver.Join` Class

The `Slarver.Join` Class implements a Readable Stream.

## To run the tests

```
npm test
```

A code coverage report will be generated in the `coverage/` directory.

## Fragment data format

* Byte 1-16: Random UUID for the split. All fragments created in one split
  will have the same UUID. It is a 128 bit big-endian.
* Byte 17: The number of fragments created.
* Byte 18: The number of fragments required to re-create the original stream.
* Byte 19: The index for this fragment file.
* Byte 20-: The very data...
