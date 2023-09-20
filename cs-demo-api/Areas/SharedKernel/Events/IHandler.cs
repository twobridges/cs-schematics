using System;

namespace cs_demo_api.SharedKernel.Domain.Events
{

    // https://app.pluralsight.com/course-player?clipId=ee4d24a1-b3dd-435b-9ab9-010d7d536900
    // IHandler is an interface for all DomainEvent Handlers in our codebase
    public interface IHandler<T>
        // T denotes the type of domain event that it must handle
        where T : IDomainEvent
    {
        void Handle(T domainEvent);
    }
}
