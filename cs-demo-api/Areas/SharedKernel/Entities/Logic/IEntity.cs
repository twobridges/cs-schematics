using System;

namespace cs_demo_api.SharedKernel.Domain.Logic
{
    // DG: not sure if Timestamps belong in the domain logic model. 
    // It really depends on whether they are just part of domain language for EVERY entity or whether they are an artefact of auditing which is not the concern of every single somain object.  
    public interface IEntity<Tpk> : IEntityTimestamps
    {
        Tpk Id { get; }

    }
    public interface IEntityTimestamps
    {
        DateTime? CreatedUtc { get; set; }
        string CreatedBy { get; set; }
        DateTime? UpdatedUtc { get; set; }
        string UpdatedBy { get; set; }
        DateTime? DeletedUtc { get; set; }
        string DeletedBy { get; set; }

    }

}
