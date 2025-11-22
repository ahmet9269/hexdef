#include "ComplexSignal.hpp"

namespace c_hex {
namespace domain {
namespace model {

    ComplexSignal::ComplexSignal(const std::string& id, long time, 
                               const std::vector<double>& wave,
                               const std::vector<std::vector<double>>& spec,
                               const std::vector<float>& bands,
                               bool valid, const std::string& device, double gain)
        : signalId(id), timestamp(time), rawWaveform(wave), spectrogram(spec),
          frequencyBands(bands), isValid(valid), sourceDevice(device), gain(gain) {}

    ComplexSignal::ComplexSignal() : timestamp(0), isValid(false), gain(0.0) {}

    ComplexSignal::~ComplexSignal() = default;

    std::string ComplexSignal::getSignalId() const { return signalId; }
    long ComplexSignal::getTimestamp() const { return timestamp; }
    std::vector<double> ComplexSignal::getRawWaveform() const { return rawWaveform; }
    std::vector<std::vector<double>> ComplexSignal::getSpectrogram() const { return spectrogram; }
    bool ComplexSignal::getIsValid() const { return isValid; }
    std::string ComplexSignal::getSourceDevice() const { return sourceDevice; }

    void ComplexSignal::setSpectrogram(const std::vector<std::vector<double>>& spec) { spectrogram = spec; }
    void ComplexSignal::setGain(double newGain) { gain = newGain; }

}
}
}
