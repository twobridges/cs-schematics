using cs_demo_api.Areas.SharedKernel.Application.Services;
using cs_demo_api.Domain.Services.Interfaces;
using Microsoft.Extensions.Logging;
using ServiceConfig;
using System.Security.Claims;

namespace cs_demo_api.Domain.Services
{
    [InjectService(typeof(IIdentityService))]

    public class IdentityService : IIdentityService
    {
        // Access HttpContext in ASP.NET Core: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/http-context?view=aspnetcore-5.0
        private readonly IUserService _svcUser;

        private readonly ILogger<IdentityService> _logger;

        public IdentityService(
            IUserService svcUser,
            ILogger<IdentityService> logger)
        {
            _svcUser = svcUser;
            _logger = logger;
        }

        public string GetUsername()
        {
            var principle = this._svcUser.GetUser();
            var username = principle?.FindFirst(c => c.Type == ClaimTypes.NameIdentifier)?.Value;

            return username;
        }
        public int? GetUserId()
        {
            var principle = this._svcUser.GetUser();
            var sidClaim = principle?.FindFirst(c => c.Type == ClaimTypes.Sid)?.Value;
            int userId;

            if (int.TryParse(sidClaim, out userId))
            {
                return userId;
            }
            else
            {
                return null;
            }
        }

    }
}
