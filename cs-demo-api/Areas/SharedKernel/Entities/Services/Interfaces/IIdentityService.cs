namespace cs_demo_api.Domain.Services.Interfaces
{
    public interface IIdentityService
    {
        int? GetUserId();
        string GetUsername();
    }
}
