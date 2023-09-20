using System;
using System.Collections.Generic;
using System.Linq;
using cs_demo_api.SharedKernel.Domain.Logic;
using CSharpFunctionalExtensions;


namespace cs_demo_api.Areas.Orders.Domain.Entities
{
    public class Order : Entity<int>
    {
        protected Order() { }

        public DateTime OrderDate { get; set; }
        public string OrderNumberNumber { get; set; }
        public string InvoiceNumber { get; set; }
        public bool Paid { get; set; }

        private readonly List<OrderItem> _OrderItem = new List<OrderItem>();
        public virtual IReadOnlyList<OrderItem> OrderItem => _OrderItem.ToList();
    }
}
