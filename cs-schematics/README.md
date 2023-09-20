[todo](./readme/todo.md)

# PC - getting started
```bash
# check if mklink is available on PC.  
cmd /c mklink

# if not, see this document: https://sites.google.com/twobridges.com.au/dev/dev-blog/november-2020/git/git-symbolic-links
# eg. win > search > use developer features > Developer Mode: ON

# enable git symlinks
git config --global core.symlinks true

# RE-CLONE the repo with links.  This is required after enabling git symlnks.

```

# get the code
```bash

cd ~/code
git clone git@github.com:twobridges/cs-schematics.git tb-utils

```

# cs-schematics


build:watch

debug
```bash
# term1: start watch
cd ~/code/tb-utils/cs-schematics \
  && npm run build:watch

# term2: gen:models
cd ~/code/tb-utils/cs-schematics-ws/ng-demo \
  && npm run gen:models


# clear all models
cd ~/code/tb-utils/cs-schematics-ws/ng-demo \
  && rm -rf src/app/cs-gen/model/* 


```

release
```bash
cd ~/code/tb-utils/cs-schematics \
  && npm run build
```

# install
```bash

# register schematic - global
cd ~/code/tb-utils/cs-schematics
npm link

# install
cd ~/code/tb-utils/cs-schematics
npm link

# uninstall 
cd ~/code/tb-utils/cs-schematics
npm unlink --no-save cs-schematics

```

# Getting Started With Schematics

This repository is a basic Schematic implementation that serves as a starting point to create and publish Schematics to NPM.

### Testing

To test locally, install `@angular-devkit/schematics-cli` globally and use the `schematics` command line tool. That tool acts the same as the `generate` command of the Angular CLI, but also has a debug mode.

Check the documentation with
```bash
schematics --help
```

### Unit Testing

`npm run test` will run the unit tests, using Jasmine as a runner and test framework.

### Publishing

To publish, simply do:

```bash
npm run build
npm publish
```

That's it!
 