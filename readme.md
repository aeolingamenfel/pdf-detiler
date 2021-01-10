# PDF De-Tiler

Command line tool which takes PDFs which have multiple pages and produces a PDF
which is just one page, wherein the contents of the page are the contents of the
input PDF's pages tiled.

Created with garment patterns in mind, but can theoretically be used on most
PDFs.

## Caveats

This tool is not very complicated, and assumes the following are true for the
input PDF:

  - All of the pages are the same size (the tool uses the first page's dimensions to compute the output size)
  - The pages are in order; left-to-right, top-to-bottom (ie. if you have a 3 column output, page 1 is the top left corner, page 4 is right below page 1, and so on)

The tool also may not handle very large (> 100 page) PDFs at this time. Please
file an issue if you have a PDF of that size that you wish to convert.

## Quickstart

PDF De-Tiler requires Node.js. To get a copy, go to the
[Node.js Downloads Page](https://nodejs.org/en/download/) and run the relevant
installer for your system.

Once you have Node.js, install the tool by running the following command in a 
terminal:

```bash
npm i -g pdf-detiler
```

You can now begin to use the tool! Just specify the PDF you want to convert, and
the number of columns that PDF has:

```bash
pdf-detiler -columns 4 my-cool-pattern.pdf
```

By default, the tool assumes the specified file path is relative to the working
directory the CLI was run from.

## Questions, Comments, Concerns, Issues

Please feel free to file a new issue on this project's issue tracker
[(link)](https://github.com/aeolingamenfel/pdf-detiler/issues) or by starting
a new discussion
[(link)](https://github.com/aeolingamenfel/pdf-detiler/discussions).

## Contributing

Want to make a change? Feel free to send a PR.

That being said, the codebase needs a little sprucing up: it could use some
unit tests, a linter, and various other small cleanups and documentation. Until
that all gets in place, just try to follow the
[Google Javascript Style Guide](https://google.github.io/styleguide/jsguide.html)
where possible, but don't worry about being rigourous about adhereing to it.
