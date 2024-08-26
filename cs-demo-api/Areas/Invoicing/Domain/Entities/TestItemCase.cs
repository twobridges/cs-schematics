using System;
using System.Collections.Generic;
using System.Linq;
using cs_demo_api.SharedKernel.Domain.Logic;
using CSharpFunctionalExtensions;


namespace cs_demo_api.Areas.Invoicing.Domain.Entities
{

    public class TestItemCase
    {
        protected TestItemCase() { }

        // this should convert to model property 'id', not 'iD'
        public int ID { get; set; }
        public int RELATEDID { get; set; }
        public string StringValue { get; set; }
    }
}
