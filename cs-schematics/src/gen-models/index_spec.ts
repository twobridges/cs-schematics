
// it('performs full test', () => {
//     let tree: UnitTestTree = new UnitTestTree(new HostTree());
//     tree.create('a/b/c.ts', 'typescript file should have a license');

//     const runner = new SchematicTestRunner('schematics', collectionPath);
//     const resultTree = runner.runSchematic('add-license', { sourceDir: 'a' }, tree);
//     expect(resultTree.files.length).toBe(1);

//     const filePath = path.join(__dirname, 'file-snapshots', 'performs-full-test.txt');
//     expect(resultTree.readContent('a/b/c.ts')).toMatchFileContentsAtPath(filePath);
// });