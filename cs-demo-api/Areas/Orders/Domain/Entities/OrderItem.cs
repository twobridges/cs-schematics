using System;
using System.Collections.Generic;
using System.Linq;
using cs_demo_api.SharedKernel.Domain.Logic;
using CSharpFunctionalExtensions;


namespace cs_demo_api.Areas.Orders.Domain.Entities
{
    public class OrderItem : Entity<int>
    {
        protected OrderItem() { }

        public float Units { get; set; }
        public string UnitType { get; set; }

        public Decimal PriceInc { get; set; }
        public Decimal PriceEx { get; set; }
        public Decimal PriceTax { get; set; }
        public string Sku { get; set; }


    }
}
