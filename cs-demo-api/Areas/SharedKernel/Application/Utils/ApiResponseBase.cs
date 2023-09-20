using System;
using System.ComponentModel.DataAnnotations;
using CSharpFunctionalExtensions;
using Microsoft.AspNetCore.Mvc;

namespace cs_demo_api.Domain.Services
{
    public class ApiResponse : ValidationProblemDetails
    {
        public bool IsSuccess { get; protected set; }
        public string Error { get; protected set; }

        public static ApiResponse CreateFailure(string error)
        {
            return new ApiResponse()
            {
                IsSuccess = false,
                Error = error
            };
        }
        public static ApiResponse CreateSuccess()
        {
            return new ApiResponse()
            {
                Title = "",
                IsSuccess = true,
                Error = null
            };
        }
    }
    public class ApiResponse<T> : ApiResponse
    {
        public T Data { get; protected set; }

        public static ApiResponse<T> CreateSuccess(T data)
        {
            return new ApiResponse<T>()
            {
                Title = "",
                IsSuccess = true,
                Error = null,
                Data = data
            };
        }
    }


}
