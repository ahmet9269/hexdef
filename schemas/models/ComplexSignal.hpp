#pragma once

#include <string>
#include <vector>

namespace c_hex {
namespace domain {
namespace model {

    class ComplexSignal {
    private:
        std::string signalId;
        long timestamp;
        std::vector<double> rawWaveform;
        std::vector<std::vector<double>> spectrogram;
        std::vector<float> frequencyBands;
        bool isValid;
        std::string sourceDevice;
        double gain;

    public:
        ComplexSignal(const std::string& id, long time, 
                     const std::vector<double>& wave,
                     const std::vector<std::vector<double>>& spec,
                     const std::vector<float>& bands,
                     bool valid, const std::string& device, double gain);
        ComplexSignal();
        virtual ~ComplexSignal();

        std::string getSignalId() const;
        long getTimestamp() const;
        std::vector<double> getRawWaveform() const;
        std::vector<std::vector<double>> getSpectrogram() const;
        bool getIsValid() const;
        std::string getSourceDevice() const;

        void setSpectrogram(const std::vector<std::vector<double>>& spec);
        void setGain(double newGain);
    };

}
}
}
