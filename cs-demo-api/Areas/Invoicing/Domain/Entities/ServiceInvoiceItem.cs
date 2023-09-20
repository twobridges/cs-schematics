using System;
using System.Collections.Generic;
using System.Linq;
using cs_demo_api.SharedKernel.Domain.Logic;
using CSharpFunctionalExtensions;


namespace cs_demo_api.Areas.Invoicing.Domain.Entities
{
    public class ServiceInvoiceItem : InvoiceItem
    {
        protected ServiceInvoiceItem() { }

        public string Service { get; set; }
        public double EstEffortHours { get; set; }


    }
}
