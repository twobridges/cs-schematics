
using Microsoft.AspNetCore.Http;
using ServiceConfig;
using System.Security.Claims;

namespace cs_demo_api.Areas.SharedKernel.Application.Services
{
    public interface IUserService
    {
        ClaimsPrincipal GetUser();
    }

    [InjectService(typeof(IUserService))]
    public class UserService : IUserService
    {
        private readonly IHttpContextAccessor accessor;

        public UserService(IHttpContextAccessor accessor)
        {
            this.accessor = accessor;
        }

        public ClaimsPrincipal GetUser()
        {
            return accessor?.HttpContext?.User as ClaimsPrincipal;
        }
    }
}
