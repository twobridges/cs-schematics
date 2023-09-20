[readme](../README.md)


# Handling Enums
* when dotnet returns an enum value in json, it is converted to a NUMERIC value
* however, when dotnet parses json input, it will accept EITHER int value; or, string value (matching the exact pascal-case name of the enum value)
* this is the same as typescript handles enums.  It will accept the string or int value of the enum
* half-solution: use a simple string type guard (ie. string union), such as https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types
    * eg. invoiceStatus: 'draft' | 'closed'



# Issues with fluffy spoon - Class with Generic Parameter does not populate inherits

* ```c#
    // DG: this does not parse by fluffyspoon:
    public class AggregateRoot<Tpk> : Entity<Tpk>
    {}

    // however, this does:
    public class AggregateRoot : Entity<int>

    {}
    ```

* ```typescript
    // this collection will be empty
    clsSourceInfo.cls?.inheritsFrom

    // see: src/gen-models/CSharpClassInfo.ts
    CSharpClassInfo.getBaseProps();

    ```