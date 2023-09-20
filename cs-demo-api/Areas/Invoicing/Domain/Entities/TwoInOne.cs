using System;
using System.Collections.Generic;
using System.Linq;
using cs_demo_api.SharedKernel.Domain.Logic;
using CSharpFunctionalExtensions;


namespace cs_demo_api.Areas.Invoicing.Domain.Entities
{

    public partial class BaseClass
    {
        public string BaseProp { get; set; }
    }
    public partial class FirstClass : BaseClass
    {
        protected FirstClass() { }

        public DateTime InvoiceDate { get; set; }
        public string InvoiceNumber { get; set; }
        public string InvoiceTo { get; set; }
        public string BillingAddress { get; set; }

        private readonly List<InvoiceItem> _InvoiceItem = new List<InvoiceItem>();
        public virtual IReadOnlyList<InvoiceItem> InvoiceItem => _InvoiceItem.ToList();

    }
    public partial class SecondClass
    {
        protected SecondClass() { }

        public DateTime InvoiceDate { get; set; }
        public string InvoiceNumber { get; set; }
        public string InvoiceTo { get; set; }
        public string BillingAddress { get; set; }

        private readonly List<InvoiceItem> _InvoiceItem = new List<InvoiceItem>();
        public virtual IReadOnlyList<InvoiceItem> InvoiceItem => _InvoiceItem.ToList();

    }
}
