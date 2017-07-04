slarver
=======

This nodejs module will take one stream and split it up into multiple smaller
streams with redundant parts (called "fragments"). To join the fragment
streams together to the original stream, you will only need a subset of the
fragments, since they overlap some data.

As the name suggests ("slarver" is a swedish word for someone who is careless,
sloppy and loses/misplaces stuff), this module was made for protecting from
data loss when storage gets partially lost/unavailable.

## Example

In this example, we split a stream into five fragment streams.
Later, we can re-create the original stream from just three out of those five
fragments.

```
const slarver = require('slarver');

const splitter = new slarver.Split(5, 3);
// First argument in the class constructor is the number of fragments to
// create, and the second argument is how many of the fragments you would
// need to recreate the original data.

fs.createReadStream('example.blob').pipe(slarver);

splitter.fragments[0].pipe(fs.createWriteStream('example.blob-fragment0'));
splitter.fragments[1].pipe(fs.createWriteStream('example.blob-fragment1'));
splitter.fragments[2].pipe(fs.createWriteStream('example.blob-fragment2'));
splitter.fragments[3].pipe(fs.createWriteStream('example.blob-fragment3'));
splitter.fragments[4].pipe(fs.createWriteStream('example.blob-fragment4'));
```

To join three of those streams together into the original stream:

```
const slarver = require('slarver');

const joiner = new slarver.Join();

// You can use any three of the five fragments, in any order:
joiner.source(fs.createReadStream('example.blob-fragment4'));
joiner.source(fs.createReadStream('example.blob-fragment1'));
joiner.source(fs.createReadStream('example.blob-fragment3'));

joiner.pipe(fw.createWriteStream('example.blob-copy'));
```

## The `slarver.Split` Class

The `slarver.Split` Class implements a Writable Stream.

## The `Slarver.Join` Class

The `slarver.Join` Class implements a Readable Stream.

## To run the tests

```
npm test
```

A code coverage report will be generated in the `coverage/` directory.

## Fragment data format, version 1

* Byte 1: Format version number. (1 is the current format version number.)
* Byte 2-17: Random UUID for the split. All fragments created in one split
  will have the same UUID. It is a 128 bit big-endian.
* Byte 18: The number of fragments created.
* Byte 19: The number of fragments required to re-create the original stream.
* Byte 20: The index for this fragment file.
* Byte 21-: The very data...
