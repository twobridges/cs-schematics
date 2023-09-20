using System;
using System.Collections.Generic;
using System.Linq;
using cs_demo_api.SharedKernel.Domain.Logic;
using CSharpFunctionalExtensions;


namespace cs_demo_api.Areas.Invoicing.Domain.Entities
{
    public enum InvoiceStatus
    {
        Draft,
        Closed
    }

    public class CommentsByHourRequest
    {
        public List<DateTime> HourStarts { get; set; }
    }

    public class Invoice : AggregateRoot
    {
        protected Invoice() { }

        public DateTime InvoiceDate { get; set; }
        public InvoiceStatus InvoiceStatus { get; set; }
        public int Num1 { get; set; }
        public int? Num2 { get; set; }
        public float Num3 { get; set; }
        public float? Num4 { get; set; }
        public double Num5 { get; set; }
        public double? Num6 { get; set; }
        public string InvoiceNumber { get; set; }
        public string InvoiceTo { get; set; }
        public string BillingAddress { get; set; }
        public byte[] TsReplication { get; set; }

        private readonly List<InvoiceItem> _InvoiceItem = new List<InvoiceItem>();
        public virtual IReadOnlyList<InvoiceItem> InvoiceItem => _InvoiceItem.ToList();
    }
}
