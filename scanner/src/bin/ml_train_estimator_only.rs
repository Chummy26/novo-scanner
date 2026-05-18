use clap::Parser;
use scanner::ml::training::estimator_only::{run, Cli};

fn main() -> anyhow::Result<()> {
    run(Cli::parse())
}
