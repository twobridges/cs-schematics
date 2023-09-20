using System;
using System.Collections.Generic;
using cs_demo_api.SharedKernel.Domain.Events;

namespace cs_demo_api.SharedKernel.Domain.Logic
{
    // DG: this does not parse by fluffyspoon:
    // public class AggregateRoot<Tpk> : Entity<Tpk>
    // however, this does:
    // public class AggregateRoot : Entity<int>
    public class AggregateRoot : Entity<int>
    {
    }

    // DDD and EF Core: https://app.pluralsight.com/course-player?clipId=e1bdbe06-2c71-466c-93ad-3fb7bc7b48b6
    public abstract class Entity<Tpk> : IEntity<Tpk>
    {
        // no setter required.  EFcore binds to "backing fields" by default
        public Tpk Id { get; private set; }
        public DateTime? CreatedUtc { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? UpdatedUtc { get; set; }
        public string UpdatedBy { get; set; }
        public DateTime? DeletedUtc { get; set; }
        public string DeletedBy { get; set; }

        public override bool Equals(object obj)
        {
            if (!(obj is Entity<Tpk> other))
            {
                return false;
            }

            if (ReferenceEquals(this, other))
            {
                return true;
            }

            if (GetRealType() != other.GetRealType())
            {
                return false;
            }

            if (Id.Equals(default(Tpk)) || other.Id.Equals(default(Tpk)))
            {
                return false;
            }

            return Id.Equals(other.Id);
        }

        public static bool operator ==(Entity<Tpk> a, Entity<Tpk> b)
        {
            if (a is null && b is null)
            {
                return true;
            }

            if (a is null || b is null)
            {
                return false;
            }

            return a.Equals(b);
        }

        public static bool operator !=(Entity<Tpk> a, Entity<Tpk> b)
        {
            return !(a == b);
        }

        public override int GetHashCode()
        {
            // http://bit.ly/1FXzTg1
            return $"{GetType().ToString()}{Id}".GetHashCode();
        }

        private Type GetRealType()
        {
            Type type = GetType();
            if (type.ToString().Contains("Castle.Proxies."))
            {
                return type.BaseType;

            }
            return type;
        }
    }

    public class SyncScope
    {
        public Dictionary<DateTime, SyncHourScope> Hours { get; set; } = new Dictionary<DateTime, SyncHourScope>();


    }
    public class SyncHourScope
    {

        public DateTime HourStart { get; set; }
        public static SyncHourScope Create(DateTime hourStart)
        {
            return new SyncHourScope() { HourStart = hourStart };
        }
    }

    public class SyncDayStnScope
    {

        public int DayStnId { get; set; }
        public static SyncDayStnScope Create(int dayStnId)
        {
            return new SyncDayStnScope() { DayStnId = dayStnId };
        }

    }

}
