#include "Invoice.hpp"

namespace c_hex {
namespace domain {
namespace model {

    Invoice::Invoice(const std::string& number, const std::string& date, bool paid)
        : invoiceNumber(number), issueDate(date), isPaid(paid) {}

    Invoice::Invoice() : isPaid(false) {}

    Invoice::~Invoice() = default;

    std::string Invoice::getInvoiceNumber() const { return invoiceNumber; }
    std::string Invoice::getIssueDate() const { return issueDate; }
    bool Invoice::getIsPaid() const { return isPaid; }

    void Invoice::setPaid(bool paid) { isPaid = paid; }

}
}
}
