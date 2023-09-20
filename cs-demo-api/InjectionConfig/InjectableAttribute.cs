using System;

namespace ServiceConfig
{
    [AttributeUsage(AttributeTargets.Class, Inherited = false)]
    public class InjectServiceAttribute : Attribute
    {
        public InjectServiceAttribute(Type sourceType)
        {
            SourceType = sourceType;
        }
        public Type SourceType { get; }
    }
}
