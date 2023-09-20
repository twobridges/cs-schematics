using System;
using System.Collections.Generic;
using System.Linq;
using cs_demo_api.SharedKernel.Domain.Logic;
using CSharpFunctionalExtensions;


namespace cs_demo_api.Areas.Invoicing.Domain.Entities
{
    public class InvoiceItem : Entity<int>
    {
        protected InvoiceItem() { }

        public Decimal AmountInc { get; set; }
        public Decimal AmountEx { get; set; }
        public Decimal AmountTax { get; set; }
        public string ItemName { get; set; }
        public Invoice Invoice { get; set; }


    }
}
