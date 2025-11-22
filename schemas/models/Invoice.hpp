#pragma once

#include <string>

namespace c_hex {
namespace domain {
namespace model {

    class Invoice {
    private:
        std::string invoiceNumber;
        std::string issueDate;
        bool isPaid;

    public:
        Invoice(const std::string& number, const std::string& date, bool paid);
        Invoice();
        virtual ~Invoice();

        std::string getInvoiceNumber() const;
        std::string getIssueDate() const;
        bool getIsPaid() const;

        void setPaid(bool paid);
    };

}
}
}
