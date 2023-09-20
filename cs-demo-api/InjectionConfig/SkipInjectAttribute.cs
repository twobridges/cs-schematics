using System;

namespace InjectionConfig
{
    [AttributeUsage(AttributeTargets.Class, Inherited = false)]
    public class SkipInjectAttribute : Attribute
    {
        public SkipInjectAttribute()
        {
        }
    }
}
