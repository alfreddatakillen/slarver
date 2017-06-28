slarver
=======

This nodejs module will take one stream and split it up into multiple smaller
streams with redundant parts. To join the smaller streams together to the
original stream again, you will only need a subset of the smaller streams,
since they overlap some data.

For example, to split one stream into five smaller streams, and then use three
of those for recreating to original stream:

```
const Slarver = require('slarver');

const slarver = new Slarver.Split(5, 3);
// First argument in the class constructor is the number of streams to split
// into, and the second argument is how many to the splits you would need to
// recreate the original data.

fs.createReadStream('example.blob').pipe(slarver);

slarver.splits[0].pipe(fs.createWriteStream('example.blob-split0'));
slarver.splits[1].pipe(fs.createWriteStream('example.blob-split1'));
slarver.splits[2].pipe(fs.createWriteStream('example.blob-split2'));
slarver.splits[3].pipe(fs.createWriteStream('example.blob-split3'));
slarver.splits[4].pipe(fs.createWriteStream('example.blob-split4'));
```

To join three of those streams together into the original stream:

```
const Slarver = require('slarver');

const slarver = new Slarver.Join();

// You can use any three of the five splits, in any order:
slarver.source(fs.createReadStream('example.blob-split4'));
slarver.source(fs.createReadStream('example.blob-split1'));
slarver.source(fs.createReadStream('example.blob-split3'));

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
